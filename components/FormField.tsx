import * as React from "react";
import {
  FormControl,
  FormField as FormFieldWrapper,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface FormFieldProps {
  control: any;
  name: string;
  label: string;
  placeholder?: string;
  type: string;
  accept?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const FormField = ({
  control,
  name,
  label,
  placeholder,
  type,
  accept,
  onChange,
}: FormFieldProps) => {
  return (
    <FormFieldWrapper
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={placeholder}
              type={type}
              accept={accept}
              value={type === "file" ? undefined : field.value}
              onChange={(e) => {
                field.onChange(e);
                onChange?.(e);
              }}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default FormField;
