import {
  resolveBubbleById as resolveBubbleByIdCanonical
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import type { ResolveBubbleByIdPort } from "../../ports/bubbleLookup.js";

export const resolveBubbleById: ResolveBubbleByIdPort = async (...args) =>
  resolveBubbleByIdCanonical(...args);
