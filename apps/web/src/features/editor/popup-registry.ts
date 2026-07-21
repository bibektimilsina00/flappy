// Tracks open node popups (model selector, param panel) so a click on the
// canvas can close them *first* — and block React Flow's deselect — instead of
// clearing the node selection in the same click.

type Close = () => void;

const closers = new Set<Close>();

export const popupRegistry = {
  register(fn: Close): () => void {
    closers.add(fn);
    return () => closers.delete(fn);
  },
  hasOpen(): boolean {
    return closers.size > 0;
  },
  closeAll(): void {
    for (const fn of [...closers]) fn();
    closers.clear();
  },
};
