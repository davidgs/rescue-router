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
import React, { useEffect, useState } from 'react';
import { MarkerF } from '@react-google-maps/api';
import { IPerson } from '../types';
import Info from './Info';

export default function PlaceInfo({
  markerPlaces,
  type,
  drivers,
  placeCallback,
}: {
  markerPlaces: IPerson[];
  type: string;
  drivers: IPerson[];
  placeCallback:
    | ((
        // eslint-disable-next-line no-unused-vars
        rider?: IPerson | null | undefined,
        // eslint-disable-next-line no-unused-vars
        driver?: IPerson | null | undefined
      ) => void)
    | null;
}) {
  const icon = () => {
    switch (type) {
      case 'drivers':
        return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      case 'attendees':
        return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      default:
        return 'https://maps.google.com/mapfiles/kml/pal2/icon11.png';
    }
  };

  const [myPlaces, setMyPlaces] = useState<IPerson[]>(markerPlaces);
  const [myDrivers, setMyDrivers] = useState<IPerson[]>(drivers);

  useEffect(() => {
    setMyPlaces(markerPlaces);
  }, [markerPlaces]);

  useEffect(() => {
    setMyDrivers(drivers);
  }, [drivers]);

  const [selected, setSelected] = useState<IPerson | null>(null);

  const setDriver = (ri: IPerson | null, dri: IPerson | null) => {
    setSelected(null);
    if (placeCallback) placeCallback(ri, dri);
  };

  return (
    <>
      {myPlaces
        ? myPlaces.map((marker) => (
            <MarkerF
              key={`${marker.location.lat * marker.location.lng}`}
              position={{
                lat: marker.location.lat,
                lng: marker.location.lng,
              }}
              title={marker.name}
              animation={window.google.maps.Animation.DROP}
              onClick={() => {
                setSelected(marker);
              }}
              icon={{
                url: icon(),
              }}
            />
          ))
        : null}
      {selected ? (
        <Info inf={selected} drivers={myDrivers} infoCallback={setDriver} />
      ) : null}
    </>
  );
}
