export type ActionState = { error?: string; success?: string; codeSent?: boolean; email?: string };
export type FormAction = (state: ActionState, form: FormData) => Promise<ActionState>;
