import {
  resolveBubbleById as resolveBubbleByIdDefaults
} from "../../defaults/bubbleLookup/bubbleLookupDefaults.js";
import type { ResolveBubbleByIdPort } from "../ports/bubbleLookup.js";

export const resolveBubbleById: ResolveBubbleByIdPort = async (...args) =>
  resolveBubbleByIdDefaults(...args);
