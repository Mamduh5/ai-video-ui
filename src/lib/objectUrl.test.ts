import { createManagedObjectUrl } from "./objectUrl";

describe("object URL helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates and revokes object URLs once", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:test-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const blob = new Blob(["image"], { type: "image/png" });
    const managedUrl = createManagedObjectUrl(blob);

    expect(managedUrl.url).toBe("blob:test-url");
    expect(createObjectURL).toHaveBeenCalledWith(blob);

    managedUrl.revoke();
    managedUrl.revoke();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
  });
});

