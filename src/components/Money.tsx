import { formatMoney, formatMoneyExact } from '../lib/format';

export default function Money({ value, exact = false }: { value: number; exact?: boolean }) {
  return (
    <span className={value < 0 ? 'money neg' : 'money'}>
      {exact ? formatMoneyExact(value) : formatMoney(value)}
    </span>
  );
}
