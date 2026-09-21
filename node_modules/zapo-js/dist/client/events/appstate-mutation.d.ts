import type { WaAppStateMutation } from '../../appstate/types';
import type { WaAppStateMutationEvent } from '../types';
export declare function parseAppStateMutationEvent(mutation: WaAppStateMutation): WaAppStateMutationEvent | null;
