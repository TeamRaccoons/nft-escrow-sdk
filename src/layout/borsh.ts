import { Layout, offset, seq, struct, u32 } from "@solana/buffer-layout";

// Can't get that thing to work
export function vec<T>(
  elementLayout: Layout<T>,
  property?: string
): Layout<T[]> {
  const length = u32("length");
  const values = seq(elementLayout, offset(length, -length.span), "values");
  //   const layout: Layout<{ length: number; values: T[] }> = struct([
  //     length,
  //     values,
  //   ]);
  return values;
}
