declare module 'react-big-calendar' {
  import * as React from 'react';

  export type View = 'month' | 'week' | 'day' | 'agenda';
  
  export interface Event {
    title: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: any;
  }

  export interface DateLocalizerProps {
    format: (date: Date, format: string, culture?: string) => string;
    parse: (str: string, format: string) => Date;
    startOfWeek: (culture?: string) => number;
    getDay: (date: Date) => number;
    locales: { [key: string]: any };
  }

  export interface CalendarProps {
    localizer: any;
    events: any[];
    startAccessor?: string | ((event: any) => Date);
    endAccessor?: string | ((event: any) => Date);
    style?: React.CSSProperties;
    onSelectEvent?: (event: any) => void;
    eventPropGetter?: (event: any) => { style?: React.CSSProperties };
    view?: View;
    onView?: (view: View) => void;
    views?: View[] | { [key: string]: boolean };
    messages?: any;
    culture?: string;
  }

  export class Calendar extends React.Component<CalendarProps> {}

  export function dateFnsLocalizer(props: DateLocalizerProps): any;
}
