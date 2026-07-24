import { VirtualizedEpgGrid, type VirtualizedEpgGridProps } from './VirtualizedEpgGrid';

export type EpgGridProps = VirtualizedEpgGridProps;

export function EpgGrid(props: EpgGridProps) {
  return <VirtualizedEpgGrid {...props} />;
}
