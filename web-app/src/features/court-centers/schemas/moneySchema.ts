import z from "zod";

const MoneySchema = z.object({
  amount: z.string(),
  currency: z.string(),
});

export default MoneySchema;
