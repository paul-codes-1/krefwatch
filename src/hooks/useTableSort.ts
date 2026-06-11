/**
 * Sortable-table state hook.
 * Adapted from the LFUCG contributors reference app (~/lt/contributors/src/hooks/useTableSort.ts).
 */
import { useCallback, useState } from 'react';
import type { SortDirection } from '../lib/utils';

const useTableSort = <Field extends string>(defaultField: Field, defaultDirection: SortDirection = 'desc') => {
  const [sortField, setSortField] = useState<Field>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection);

  const handleSort = useCallback(
    (field: Field) => {
      setSortField((currentField) => {
        if (currentField === field) {
          setSortDirection((currentDir) => (currentDir === 'asc' ? 'desc' : 'asc'));
          return currentField;
        }
        setSortDirection(defaultDirection);
        return field;
      });
    },
    [defaultDirection],
  );

  return { sortField, sortDirection, handleSort };
};

export default useTableSort;
