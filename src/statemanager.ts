export type AlgorithmState = 'add' | 'build' | 'query';
type AlgoStateListener = (newState: AlgorithmState, oldState: AlgorithmState) => void;

/**
 * Works as the model in MVC design pattern,
 * notifies the views when updating
 */
export class StateManager {
    private state: AlgorithmState = 'add';
    private listeners: AlgoStateListener[] = [];

    addListener(listener: AlgoStateListener) {
        this.listeners.push(listener);
    }

    private setState(newState: AlgorithmState) {
        if (this.state === newState) return;

        const oldState = this.state;
        this.state = newState;
        for (let listener of this.listeners)
            listener(newState, oldState);
    }

    finishAdding() {
        this.setState('build')
    }

    isAdding() {
        return this.state === 'add';
    }
}