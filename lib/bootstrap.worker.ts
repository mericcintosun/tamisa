// Web Worker: runs the 2000-draw stratified bootstrap off the main thread so the
// interval can redraw while the volunteer keeps typing weights.
import { runBootstrap, type BootstrapRequest } from "./stats";

type WorkerScope = {
  onmessage: ((event: MessageEvent<BootstrapRequest & { requestId: number }>) => void) | null;
  postMessage: (message: unknown) => void;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const { requestId, ...request } = event.data;
  scope.postMessage({ requestId, result: runBootstrap(request) });
};
