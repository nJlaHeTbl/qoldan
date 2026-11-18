'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MACHINERY_RATES,
  MATERIAL_CONDITIONS,
  MATERIAL_UNITS,
  RENTAL_RATES,
  attributeGroup,
  type AttributeGroup,
  type ListingAttributes,
} from '@/lib/listing-attributes';

// Extra characteristics that depend on the chosen category and deal type. Watches the form's
// "category" and "type" fields; inputs are named attr_* and collected by readCategoryFields().
export default function CategoryFields() {
  const anchor = useRef<HTMLFieldSetElement>(null);
  const [group, setGroup] = useState<AttributeGroup | null>(null);

  useEffect(() => {
    const form = anchor.current?.form;
    if (!form) return;
    const read = () => {
      const category = (form.elements.namedItem('category') as HTMLSelectElement | null)?.value ?? '';
      const type = (form.elements.namedItem('type') as HTMLSelectElement | null)?.value ?? '';
      setGroup(attributeGroup(category, type));
    };
    read();
    form.addEventListener('change', read);
    return () => form.removeEventListener('change', read);
  }, []);

  return (
    <fieldset ref={anchor} className="category-fields wide" style={group ? undefined : { display: 'none' }}>
      {group === 'machinery' && (
        <>
          <legend>Условия работы техники</legend>
          <label>
            Оператор
            <select name="attr_withOperator" defaultValue="">
              <option value="">Не указано</option>
              <option value="yes">С оператором</option>
              <option value="no">Без оператора</option>
            </select>
          </label>
          <label>
            Цена указана за
            <select name="attr_rate" defaultValue="">
              <option value="">Не указано</option>
              {MACHINERY_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </label>
          <label className="wide">
            Район работ
            <input name="attr_serviceArea" maxLength={120} placeholder="Например, Коксуский и Ескельдинский районы" />
          </label>
          <label className="check-line wide">
            <input type="checkbox" name="attr_travel" /> Возможен выезд к заказчику
          </label>
        </>
      )}
      {group === 'materials' && (
        <>
          <legend>Партия</legend>
          <label>
            Количество
            <input name="attr_quantity" type="number" inputMode="decimal" min="0" step="any" placeholder="1200" />
          </label>
          <label>
            Единица
            <select name="attr_unit" defaultValue="">
              <option value="">Не указано</option>
              {MATERIAL_UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <label>
            Состояние
            <select name="attr_condition" defaultValue="">
              <option value="">Не указано</option>
              {MATERIAL_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </label>
          <label className="check-line wide">
            <input type="checkbox" name="attr_partialSale" /> Можно купить часть партии
          </label>
        </>
      )}
      {group === 'rental' && (
        <>
          <legend>Условия аренды</legend>
          <label>
            Цена указана за
            <select name="attr_rate" defaultValue="">
              <option value="">Не указано</option>
              {RENTAL_RATES.map((rate) => (
                <option key={rate} value={rate}>{rate}</option>
              ))}
            </select>
          </label>
          <label>
            Залог, ₸ (0 — без залога)
            <input name="attr_deposit" type="number" inputMode="numeric" min="0" step="1" placeholder="10000" />
          </label>
          <label className="wide">
            Минимальный срок
            <input name="attr_minTerm" maxLength={120} placeholder="Например, 1 день" />
          </label>
        </>
      )}
    </fieldset>
  );
}

/** Builds the attributes object from the form; only filled fields are sent. */
export function readCategoryFields(form: FormData): ListingAttributes | undefined {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const attributes: ListingAttributes = {};
  const operator = text('attr_withOperator');
  if (operator) attributes.withOperator = operator === 'yes';
  if (text('attr_rate')) attributes.rate = text('attr_rate');
  if (text('attr_serviceArea')) attributes.serviceArea = text('attr_serviceArea');
  if (form.get('attr_travel') === 'on') attributes.travel = true;
  if (text('attr_quantity')) attributes.quantity = Number(text('attr_quantity'));
  if (text('attr_unit')) attributes.unit = text('attr_unit');
  if (text('attr_condition')) attributes.condition = text('attr_condition');
  if (form.get('attr_partialSale') === 'on') attributes.partialSale = true;
  if (text('attr_deposit')) attributes.deposit = Number(text('attr_deposit'));
  if (text('attr_minTerm')) attributes.minTerm = text('attr_minTerm');
  return Object.keys(attributes).length ? attributes : undefined;
}
