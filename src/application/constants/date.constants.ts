import { EDayNames } from '@app/dtos/date.dto'
/* sunday - 0 */
export const AppDayNames = new Map<number, EDayNames>([
  [0, EDayNames.Sunday],
  [1, EDayNames.Monday],
  [2, EDayNames.Tuesday],
  [3, EDayNames.Wednesday],
  [4, EDayNames.Thursday],
  [5, EDayNames.Friday],
  [6, EDayNames.Saturday]
])
