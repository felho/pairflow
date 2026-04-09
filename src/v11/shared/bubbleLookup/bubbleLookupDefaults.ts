import {
  resolveBubbleById as resolveBubbleByIdCore
} from "../../../core/bubble/bubbleLookup.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";

export const resolveBubbleById: ResolveBubbleByIdPort = async (...args) =>
  resolveBubbleByIdCore(...args);
