import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';

export const appRouter = createTRPCRouter({
    hello: baseProcedure
    .input(z.object({ text: z.string() })) // input validation
    .query((opts) => {                     // query = GET-like API
        return { greeting: `hello ${opts.input.text}` };
    }),

});

// export type definition of API
export type AppRouter = typeof appRouter;