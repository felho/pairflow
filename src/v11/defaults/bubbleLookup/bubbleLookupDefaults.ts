import {
  resolveBubbleById as resolveBubbleByIdCanonical
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import type { ResolveBubbleByIdPort } from "../../shared/ports/bubbleLookup.js";

export const resolveBubbleById: ResolveBubbleByIdPort = async (...args) =>
  resolveBubbleByIdCanonical(...args);
