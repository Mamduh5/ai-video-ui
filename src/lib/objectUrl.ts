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

