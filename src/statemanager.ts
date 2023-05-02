export type AlgorithmState = 'add' | 'build' | 'query';
type StateChangeListener = (newState: AlgorithmState, oldState: AlgorithmState) => void;

/**
 * Works as the model in MVC design pattern,
 * notifies the views when updating
 */
export class StateManager {
    state: AlgorithmState = 'add';
    private listeners: StateChangeListener[] = [];

    onChange(listener: StateChangeListener) {
        this.listeners.push(listener);
    }

    private setState(newState: AlgorithmState) {
        if (this.state === newState) return;

        const oldState = this.state;
        this.state = newState;
        for (let listener of this.listeners)
            listener(newState, oldState);
    }

    next() {
        if (this.state === 'add') {
            this.setState('build');
        } else if (this.state === 'build') {
            this.setState('query');
        }
    }
}