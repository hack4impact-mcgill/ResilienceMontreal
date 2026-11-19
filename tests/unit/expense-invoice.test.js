import { beforeEach, afterAll, expect, mock, test } from "bun:test";
import { createCipheriv } from "node:crypto";

const key = Buffer.alloc(32, 1);
const iv = Buffer.alloc(12, 2);
const cipher = createCipheriv("aes-256-gcm", key, iv);
const encrypted = Buffer.concat([
  cipher.update("test-refresh"),
  cipher.final(),
]);
const token = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
  "base64",
);
const configuration = {
  GOOGLE_DRIVE_CLIENT_ID: "test",
  GOOGLE_DRIVE_CLIENT_SECRET: "test",
  GOOGLE_DRIVE_ROOT_FOLDER_ID: "root",
  GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY: key.toString("base64"),
};
mock.module("../../src/env", () => ({ env: configuration }));
const integration = mock(async () => ({ encryptedRefreshToken: token }));
let storedInvoice = "invoice";
let role = "Admin";
const update = mock(async ({ data }) => data);
let createdExpense;
const create = mock(async ({ data }) => {
  createdExpense = { id: 1, ...data };
  return createdExpense;
});
const testDb = {
  googleDriveIntegration: { findUnique: integration },
  expense: {
    create,
    findUniqueOrThrow: async () => createdExpense,
    findUnique: async () => ({ id: 1, invoiceDriveFileId: storedInvoice }),
    update,
  },
  user: { findUnique: async () => ({ role }) },
};
mock.module("../../src/server/db", () => ({ db: testDb }));
let signedIn = false;
mock.module("../../src/server/auth", () => ({
  getServerAuthSession: async () => ({
    user: signedIn ? { email: "test@example.com" } : null,
  }),
}));
const { validateInvoiceDriveFile, listDriveFolderPage, getGoogleDriveStatus } =
  await import("../../src/server/google-drive");
const { resolveExpenseInvoice } = await import(
  "../../src/server/api/lib/expense-invoice"
);
const { expensesRouter } = await import(
  "../../src/server/api/routers/expenses"
);
const { GET } = await import("../../src/app/api/expenses/[id]/invoice/route");
const { Prisma } = await import("../../src/generated/prisma/client");
testDb.grantDistribution = {
  findMany: async () => [
    {
      id: 1,
      amount: new Prisma.Decimal(100),
      spentAmount: new Prisma.Decimal(0),
      grant: { endDate: null },
    },
  ],
  update: async () => ({}),
};
testDb.expenseDistribution = { createMany: async () => ({ count: 1 }) };
testDb.$transaction = async (fn) => fn(testDb);
const caller = (user = { email: "test@example.com" }) =>
  expensesRouter.createCaller({ db: testDb, user, headers: new Headers() });
const originalFetch = globalThis.fetch;
let files;
let tokenError;
beforeEach(() => {
  tokenError = false;
  role = "Admin";
  signedIn = false;
  storedInvoice = "invoice";
  update.mockClear();
  configuration.GOOGLE_DRIVE_CLIENT_ID = "test";
  integration.mockImplementation(async () => ({
    encryptedRefreshToken: token,
  }));
  files = {
    root: { id: "root", mimeType: "application/vnd.google-apps.folder" },
    folder: {
      id: "folder",
      mimeType: "application/vnd.google-apps.folder",
      parents: ["root"],
    },
    invoice: {
      id: "invoice",
      name: "invoice.pdf",
      mimeType: "application/pdf",
      parents: ["folder"],
      capabilities: { canDownload: true },
    },
  };
  globalThis.fetch = mock(async (input) => {
    const url = new URL(input);
    if (url.hostname === "oauth2.googleapis.com")
      return Response.json(
        tokenError
          ? { error: "invalid_grant" }
          : { access_token: "test-access" },
      );
    if (url.pathname === "/drive/v3/files")
      return Response.json(
        url.searchParams.get("pageToken")
          ? { files: [files.invoice] }
          : { files: [files.folder], nextPageToken: "page2" },
      );
    if (url.searchParams.get("alt") === "media")
      return new Response("mock file bytes");
    const id = url.pathname.split("/").at(-1);
    return files[id]
      ? Response.json(files[id])
      : new Response(null, { status: 404 });
  });
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});

test("validates a nested downloadable invoice and authoritative metadata", async () => {
  expect(
    await resolveExpenseInvoice({ invoiceDriveFileId: "invoice" }),
  ).toEqual({
    invoiceUrl: null,
    invoiceDriveFileId: "invoice",
    invoiceDriveFileName: "invoice.pdf",
  });
});
test("supports a file directly under root", async () => {
  files.invoice.parents = ["root"];
  expect((await validateInvoiceDriveFile("invoice")).id).toBe("invoice");
});
for (const mimeType of [
  "application/vnd.google-apps.folder",
  "application/vnd.google-apps.shortcut",
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
]) {
  test(`rejects ${mimeType}`, async () => {
    files.invoice.mimeType = mimeType;
    await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow(
      "downloadable",
    );
  });
}
test("rejects missing, trashed, nondownloadable and out-of-tree files", async () => {
  await expect(validateInvoiceDriveFile("missing")).rejects.toThrow();
  files.invoice.trashed = true;
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow();
  files.invoice.trashed = false;
  files.invoice.capabilities.canDownload = false;
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow();
  files.invoice.capabilities.canDownload = true;
  files.invoice.parents = [];
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow("outside");
});
test("rejects trashed ancestors and moved files on a subsequent check", async () => {
  await validateInvoiceDriveFile("invoice");
  files.folder.trashed = true;
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow("trash");
  files.folder.trashed = false;
  files.folder.parents = [];
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow("outside");
});
test("paginates folders without selecting them", async () => {
  expect((await listDriveFolderPage()).nextPageToken).toBe("page2");
  expect((await listDriveFolderPage(undefined, "page2")).items[0].id).toBe(
    "invoice",
  );
  await expect(listDriveFolderPage("invoice")).rejects.toThrow("folder");
  await expect(listDriveFolderPage("'bad")).rejects.toThrow("Invalid");
});
test("rejects both sources", async () => {
  await expect(
    resolveExpenseInvoice({
      invoiceUrl: "https://example.com",
      invoiceDriveFileId: "invoice",
    }),
  ).rejects.toThrow("either");
});
test("omitted fields preserve values; URL replacement and explicit clear work during outage", async () => {
  tokenError = true;
  expect(await resolveExpenseInvoice({})).toEqual({});
  expect(await resolveExpenseInvoice({ invoiceUrl: null })).toEqual({
    invoiceUrl: null,
  });
  expect(await resolveExpenseInvoice({ invoiceDriveFileId: null })).toEqual({
    invoiceDriveFileId: null,
    invoiceDriveFileName: null,
  });
  expect(
    await resolveExpenseInvoice({ invoiceUrl: "https://example.com" }),
  ).toEqual({
    invoiceUrl: "https://example.com",
    invoiceDriveFileId: null,
    invoiceDriveFileName: null,
  });
  await expect(
    resolveExpenseInvoice({ invoiceDriveFileId: "invoice" }),
  ).rejects.toThrow("revoked");
});
test("unconfigured and disconnected Drive", async () => {
  configuration.GOOGLE_DRIVE_CLIENT_ID = "";
  expect((await getGoogleDriveStatus()).configured).toBe(false);
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow(
    "configured",
  );
  configuration.GOOGLE_DRIVE_CLIENT_ID = "test";
  integration.mockImplementation(async () => null);
  expect((await getGoogleDriveStatus()).connected).toBe(false);
  await expect(validateInvoiceDriveFile("invoice")).rejects.toThrow(
    "connected",
  );
});

test("update keeps role permissions and rejects unauthorized changes before writing", async () => {
  await expect(
    caller(null).update({ id: 1, invoiceDriveFileId: "invoice" }),
  ).rejects.toThrow();
  role = "InterventionTeam";
  await expect(
    caller().update({ id: 1, invoiceDriveFileId: "invoice" }),
  ).rejects.toThrow("Only Bookkeepers");
  expect(update).not.toHaveBeenCalled();
  role = "Bookkeeper";
  const saved = await caller().update({ id: 1, invoiceDriveFileId: "invoice" });
  expect(saved.invoiceDriveFileName).toBe("invoice.pdf");
  expect(saved.invoiceUrl).toBe(null);
});
test("update rejects both sources and invalid files without writing", async () => {
  await expect(
    caller().update({
      id: 1,
      invoiceUrl: "https://example.com",
      invoiceDriveFileId: "invoice",
    }),
  ).rejects.toThrow();
  files.invoice.parents = [];
  await expect(
    caller().update({ id: 1, invoiceDriveFileId: "invoice" }),
  ).rejects.toThrow();
  expect(update).not.toHaveBeenCalled();
});
test("authenticated endpoint uses stored ID, safely opens PDFs and downloads binaries", async () => {
  const context = { params: Promise.resolve({ id: "1" }) };
  expect(
    (await GET(new Request("http://localhost/api/expenses/1/invoice"), context))
      .status,
  ).toBe(401);
  signedIn = true;
  let response = await GET(
    new Request("http://localhost/api/expenses/1/invoice?fileId=outside"),
    context,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-disposition")).toStartWith("inline");
  response = await GET(
    new Request("http://localhost/api/expenses/1/invoice?download=1"),
    context,
  );
  expect(response.headers.get("content-disposition")).toStartWith("attachment");
  files.invoice.mimeType = "text/html";
  response = await GET(
    new Request("http://localhost/api/expenses/1/invoice"),
    context,
  );
  expect(response.headers.get("content-disposition")).toStartWith("attachment");
  files.invoice.parents = [];
  expect(
    (await GET(new Request("http://localhost/api/expenses/1/invoice"), context))
      .status,
  ).toBe(400);
  storedInvoice = null;
  expect(
    (await GET(new Request("http://localhost/api/expenses/1/invoice"), context))
      .status,
  ).toBe(404);
});

test("creation stores validated metadata, preserves URL-only behavior and rejects both", async () => {
  const base = {
    fundPoolId: 1,
    totalAmount: 10,
    description: "Invoice test",
    date: new Date(),
  };
  const result = await caller().create({
    ...base,
    invoiceDriveFileId: "invoice",
  });
  expect(result.expense.invoiceDriveFileName).toBe("invoice.pdf");
  expect(result.expense.invoiceUrl).toBe(null);
  const url = await caller().create({
    ...base,
    invoiceUrl: "https://example.com",
  });
  expect(url.expense.invoiceUrl).toBe("https://example.com");
  expect(url.expense.invoiceDriveFileId).toBe(null);
  await expect(
    caller().create({
      ...base,
      invoiceUrl: "https://example.com",
      invoiceDriveFileId: "invoice",
    }),
  ).rejects.toThrow("either");
  await expect(caller(null).create(base)).rejects.toThrow();
});
