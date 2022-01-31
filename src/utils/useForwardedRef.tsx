import { MutableRefObject, Ref, useRef } from "react";

export function useForwardedRef<T>(ref?: Ref<T>): MutableRefObject<T | null> {
  const nullRef = useRef<T>(null);
  return ref && typeof ref !== 'function' ? ref : nullRef;
}
