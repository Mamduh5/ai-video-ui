import { useEffect, useMemo } from "react";

export interface ManagedObjectUrl {
  url: string;
  revoke: () => void;
}

export function createManagedObjectUrl(blob: Blob): ManagedObjectUrl {
  const url = URL.createObjectURL(blob);
  let revoked = false;

  return {
    url,
    revoke: () => {
      if (revoked) {
        return;
      }

      URL.revokeObjectURL(url);
      revoked = true;
    },
  };
}

export function useObjectUrl(blob?: Blob | null) {
  const objectUrl = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    [blob],
  );

  useEffect(() => {
    if (!objectUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return objectUrl;
}
