import * as React from "react"

import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
} from "@/components/ui/combobox"


type MultiSelectProps = {
    items: { label: string, value: string }[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

function MultiSelect({ items, value, onChange, placeholder = "Add item" }: MultiSelectProps) {
    return (
        <Combobox
            items={items}
            multiple
            value={value}
            onValueChange={onChange}
        >
            <ComboboxChips>
                <ComboboxValue>
                    {value.map((item) => (
                        <ComboboxChip key={item}>{items.find((i) => i.value === item)?.label}</ComboboxChip>
                    ))}
                </ComboboxValue>
                <ComboboxChipsInput placeholder={placeholder} />
            </ComboboxChips>
            <ComboboxContent>
                <ComboboxEmpty>No items found.</ComboboxEmpty>
                <ComboboxList>
                    {items.map((item) => (
                        <ComboboxItem key={item.value} value={item.value}>
                            {item.label}
                        </ComboboxItem>
                    ))}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

export default MultiSelect;