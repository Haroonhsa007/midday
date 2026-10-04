import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const uploadObject = mock(() =>
  Promise.resolve({ data: { path: "team/file.pdf" }, error: null }),
);
const downloadObject = mock(() =>
  Promise.resolve({
    data: new Blob(["abc"], { type: "application/pdf" }),
    error: null as unknown,
  }),
);
const infoObject = mock(() =>
  Promise.resolve({
    data: { size: 3, contentType: "application/pdf" },
    error: null,
  }),
);
const removeObjects = mock(() => Promise.resolve({ data: [], error: null }));
const listObjects = mock((path: string) =>
  Promise.resolve({
    data:
      path === "team"
        ? [{ name: "folder", id: null, metadata: null }]
        : [
            {
              name: "file.pdf",
              id: "object-id",
              metadata: { size: 3, mimetype: "application/pdf" },
              updated_at: null,
            },
          ],
    error: null,
  }),
);
const signObject = mock(() =>
  Promise.resolve({
    data: { signedUrl: "http://localhost/signed-supabase" },
    error: null,
  }),
);
const getBucket = mock(() =>
  Promise.resolve({ data: { name: "vault" }, error: null }),
);
const from = mock(() => ({
  upload: uploadObject,
  download: downloadObject,
  info: infoObject,
  remove: removeObjects,
  list: listObjects,
  createSignedUrl: signObject,
}));
mock.module("@midday/supabase/job", () => ({
  createClient: () => ({ storage: { from, getBucket } }),
}));
const upsertDocumentForObject = mock(() => Promise.resolve({ id: "doc" }));
mock.module("@midday/db/queries", () => ({ upsertDocumentForObject }));
const {
  upload,
  download,
  head,
  getStream,
  remove,
  removePrefix,
  createSignedUrl,
  createSignedUploadUrl,
  getPublicUrl,
  checkStorageHealth,
} = await import("../index");
const { uploadVaultObject } = await import("../vault");
const originalProvider = process.env.NEXT_PUBLIC_BACKEND_PROVIDER;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
beforeEach(() => {
  delete process.env.NEXT_PUBLIC_BACKEND_PROVIDER; // Existing deployments default to Supabase.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  for (const fn of [
    uploadObject,
    downloadObject,
    infoObject,
    removeObjects,
    listObjects,
    signObject,
    getBucket,
    from,
    upsertDocumentForObject,
  ])
    fn.mockClear();
});
afterAll(() => {
  if (originalProvider === undefined)
    delete process.env.NEXT_PUBLIC_BACKEND_PROVIDER;
  else process.env.NEXT_PUBLIC_BACKEND_PROVIDER = originalProvider;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
});

describe("Supabase storage compatibility", () => {
  test("default provider uploads without any S3 configuration", async () => {
    const result = await upload("vault", "team/file.pdf", "abc", {
      contentType: "application/pdf",
    });
    expect(result).toMatchObject({
      key: "team/file.pdf",
      path: "team/file.pdf",
      size: 3,
    });
    expect(from).toHaveBeenCalledWith("vault");
    expect(uploadObject).toHaveBeenCalledWith("team/file.pdf", "abc", {
      contentType: "application/pdf",
      upsert: true,
    });
  });
  test("download, stream, head, health, delete and public URL preserve provider contracts", async () => {
    expect(await (await download("vault", "team/file.pdf"))?.text()).toBe(
      "abc",
    );
    expect(
      await new Response(
        (await getStream("vault", "team/file.pdf"))?.body,
      ).text(),
    ).toBe("abc");
    expect(await head("vault", "team/file.pdf")).toMatchObject({
      size: 3,
      contentType: "application/pdf",
    });
    await checkStorageHealth();
    expect(getBucket).toHaveBeenCalledWith("vault");
    await remove("vault", ["team/file.pdf"]);
    expect(removeObjects).toHaveBeenCalledWith(["team/file.pdf"]);
    expect(getPublicUrl("avatars", "user/a #.png")).toBe(
      "http://localhost:54321/storage/v1/object/public/avatars/user/a%20%23.png",
    );
  });
  test("signed URLs use Supabase expiry/download options; local PUT endpoint is unavailable", async () => {
    expect(
      await createSignedUrl("vault", "team/file.pdf", {
        expiresIn: 3600,
        download: true,
      }),
    ).toBe("http://localhost/signed-supabase");
    expect(signObject).toHaveBeenCalledWith("team/file.pdf", 3600, {
      download: true,
    });
    await expect(
      createSignedUploadUrl("vault", "team/file.pdf", {
        contentType: "application/pdf",
      }),
    ).rejects.toThrow("local storage provider");
  });
  test("vault relies on the existing Supabase registration trigger, with no local ON CONFLICT", async () => {
    await uploadVaultObject({} as never, {
      teamId: "team",
      key: "team/file.pdf",
      body: "abc",
      contentType: "application/pdf",
    });
    expect(uploadObject).toHaveBeenCalledTimes(1);
    expect(upsertDocumentForObject).not.toHaveBeenCalled();
    await expect(
      uploadVaultObject({} as never, {
        teamId: "team",
        key: "foreign/file.pdf",
        body: "abc",
        contentType: "application/pdf",
      }),
    ).rejects.toThrow();
    expect(uploadObject).toHaveBeenCalledTimes(1);
  });
  test("folder deletion traverses Supabase folders within exact prefix", async () => {
    expect(await removePrefix("vault", "team/")).toBe(1);
    expect(listObjects).toHaveBeenCalledWith(
      "team",
      expect.objectContaining({ limit: 100, offset: 0 }),
    );
    expect(listObjects).toHaveBeenCalledWith("team/folder", expect.anything());
    expect(removeObjects).toHaveBeenCalledWith(["team/folder/file.pdf"]);
  });
  test("missing Supabase objects return null but provider errors propagate", async () => {
    downloadObject.mockImplementationOnce(() =>
      Promise.resolve({
        data: null as never,
        error: { statusCode: "404", message: "Object not found" },
      }),
    );
    expect(await download("vault", "team/missing.pdf")).toBeNull();
    downloadObject.mockImplementationOnce(() =>
      Promise.resolve({
        data: null as never,
        error: { statusCode: "403", message: "Forbidden" },
      }),
    );
    await expect(download("vault", "team/private.pdf")).rejects.toMatchObject({
      statusCode: "403",
    });
  });
});
