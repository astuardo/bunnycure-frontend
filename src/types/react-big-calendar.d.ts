declare module 'react-big-calendar' {
  import * as React from 'react';
  import type { Locale } from 'date-fns';

  export type View = 'month' | 'week' | 'day' | 'agenda';
  
  export interface Event {
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: unknown;
  }

  export interface DateLocalizerProps {
    format: (date: Date, format: string, culture?: string) => string;
    parse: (str: string, format: string) => Date;
    startOfWeek: (culture?: string) => number;
    getDay: (date: Date) => number;
    locales: { [key: string]: Locale };
  }

  export interface Localizer {
    format: (date: Date, format: string, culture?: string) => string;
    parse: (str: string, format: string) => Date;
  }

  export interface CalendarProps<TEvent = Event> {
    localizer: Localizer;
    events: TEvent[];
    startAccessor?: string | ((event: TEvent) => Date);
    endAccessor?: string | ((event: TEvent) => Date);
    style?: React.CSSProperties;
    onSelectEvent?: (event: TEvent) => void;
    eventPropGetter?: (event: TEvent) => { style?: React.CSSProperties };
    view?: View;
    onView?: (view: View) => void;
    views?: View[] | { [key: string]: boolean };
    messages?: Record<string, string | ((total: number) => string)>;
    culture?: string;
  }

  export class Calendar<TEvent = Event> extends React.Component<CalendarProps<TEvent>> {}

  export function dateFnsLocalizer(props: DateLocalizerProps): Localizer;
}
