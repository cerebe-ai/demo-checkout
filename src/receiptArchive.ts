// SPDX-License-Identifier: Apache-2.0

import { inspect } from "node:util";

export function archiveName(orderId: string): string {
  return `archive-${orderId}.json`;
}

export function archiveBody(order: unknown): string {
  return JSON.stringify(order);
}
