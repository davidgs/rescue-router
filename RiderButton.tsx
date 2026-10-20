/* The MIT License (MIT)
 *
 * Copyright (c) 2022-present David G. Simmons
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
import React, { useEffect } from 'react';
import { IPerson } from '../types';
import '../App.css';

export default function RiderButton({
  drivers,
  riderCallback,
}: {
  drivers: IPerson[];
  riderCallback: (driver: IPerson | null) => void;
}): React.JSX.Element {
  const dropdownTitle = 'Select Driver';
  const [dropdownItems, setDropdownItems] = React.useState<IPerson[]>([]);

  useEffect(() => {
    setDropdownItems(drivers);
  }, [drivers]);

  const items = dropdownItems.map((item: IPerson) => {
    return (
      <option
        id={`map-select-${item._id}`}
        key={item._id}
        onSelect={(e) => {
          const ev = e.target as HTMLSelectElement;
        }}
      >
        {item.name}
      </option>
    );
  });

  return (
    <div className="App" style={{ zIndex: 1000, textAlign: 'left' }}>
      <select
        id="dropdown-basic-button"
        onChange={(eventKey) => {
          const dr = dropdownItems.find(
            (d) =>
              `map-select-${d._id}` === eventKey.target.selectedOptions[0].id
          );
          if (dr) {
            riderCallback(dr);
          }
        }}
      >
        <option value="None Selected">{dropdownTitle}</option>
        {items}
      </select>
    </div>
  );
}
