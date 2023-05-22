export type EventListener<Event> = (e: Readonly<Event>) => void;

export interface IEventGenerator<Events extends Record<string, unknown>> {
    on<T extends string & keyof Events>(name: T, listener: EventListener<Events[T]>): void;

    notify<T extends string & keyof Events>(name: T, event: Events[T]): void;
}

export abstract class AbstractEventGenerator<Events extends Record<string, unknown>>
    implements IEventGenerator<Events>
{
    protected listeners: Partial<{ [T in keyof Events as T]: EventListener<Events[T]>[] }> = Object(null);

    on<T extends string & keyof Events>(name: T, listener: EventListener<Events[T]>): void {
        (this.listeners[name] ??= []).push(listener);
    }

    notify<T extends string & keyof Events>(name: T, event: Events[T]): void {
        this.listeners[name]?.forEach((listener) => listener(event));
    }
}
