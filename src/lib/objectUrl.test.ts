import { createManagedObjectUrl } from "./objectUrl";
import { renderHook } from "@testing-library/react";

import { useObjectUrl } from "./objectUrl";

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

  it("revokes hook object URLs on blob change and cleanup", () => {
    const createObjectURL = vi
      .fn()
      .mockReturnValueOnce("blob:first")
      .mockReturnValueOnce("blob:second");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const first = new Blob(["first"]);
    const second = new Blob(["second"]);
    const { rerender, result, unmount } = renderHook(
      ({ blob }: { blob: Blob | null }) => useObjectUrl(blob),
      {
        initialProps: { blob: first },
      },
    );

    expect(result.current).toBe("blob:first");

    rerender({ blob: second });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:first");
    expect(result.current).toBe("blob:second");

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:second");
  });
});
