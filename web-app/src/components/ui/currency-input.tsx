"use client"

import { DollarSign } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { InputHTMLAttributes } from "react";

export interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
    currency: string;
    label: string;
    onChange: (value: { amount: string; currency: string }) => void;
    value: { amount: string; currency: string };
}

const CurrencyInput = ({ currency, onChange, value, ...props }: CurrencyInputProps) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const amount = e.target.value;
        onChange?.({
            amount: amount,
            currency: currency,
        });
    };

    return (
        <div className="w-full space-y-2">
            <Label htmlFor={props.id}>{props.label}</Label>
            <div className="relative">
                <DollarSign className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
                <Input
                    className="bg-background pl-9"
                    id="currency-input"
                    min="0"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    {...props}
                    value={value?.amount}
                    onChange={handleChange}
                />
            </div>
            <p className="text-muted-foreground text-xs">Enter amount in {currency}</p>
        </div>
    );
};

export default CurrencyInput
