'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true })

export async function createInvoice(formData: FormData) {
    // const rawFormData = {
    //     "customerId": formData.get('customerId'),
    //     "amout": formData.get('amount'),
    //     "status": formData.get('status'), 
    // }

    // For more fields
    const rawFormData = Object.fromEntries(formData.entries())
    console.log(rawFormData);

    // create invoice
    const { customerId, amount, status } = CreateInvoice.parse(rawFormData);

    // To improve amount precision, lets store in cents.
    // See: https://nextjs.org/learn/dashboard-app/mutating-data#storing-values-in-cents
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
          INSERT INTO invoices (customer_id, amount, status, date)
          VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `;
    } catch (error) {
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // A listagem das faturas precisam ser revalidadas para buscarem a nova fatura
    // Assim, quando eu direcionar para a listagem de faturas, os dados estaram atualizados.
    revalidatePath("/dashboard/invoices");
    redirect("/dashboard/invoices");
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries())
    const { customerId, amount, status } = UpdateInvoice.parse(rawFormData);

    const amountInCents = amount * 100;

    try {
        await sql`
          UPDATE invoices
          SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
          WHERE id = ${id}
        `;
    } catch (error) {
        return { message: 'Database Error: Failed to Update Invoice.' }
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delete Invoice');
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        return { message: 'Deleted Invoice' };
    } catch (error) {
        return { message: 'Database Error: Failed to Delete Invoice.' }
    }
    revalidatePath('/dashboard/invoices');
}