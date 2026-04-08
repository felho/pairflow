import type { Server } from "node:http";

export async function listen(server: Server, port: number, host: string): Promise<number> {
  return new Promise<number>((resolvePromise, rejectPromise) => {
    server.once("error", (error) => {
      rejectPromise(error);
    });
    server.listen(port, host, () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        rejectPromise(
          new Error("UI server failed to resolve listening address.")
        );
        return;
      }
      resolvePromise(address.port);
    });
  });
}

export function closeServer(server: Server): Promise<void> {
  return new Promise<void>((resolvePromise, rejectPromise) => {
    server.close((error) => {
      if (error !== undefined) {
        rejectPromise(error);
        return;
      }
      resolvePromise();
    });
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
    if (typeof server.closeIdleConnections === "function") {
      server.closeIdleConnections();
    }
  });
}
