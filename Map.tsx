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
import { useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { IPerson, ChurchPlace } from './types';

import './App.css';
import PlaceInfo from './map-components/Places';

const gLibraries: (
  | 'drawing'
  | 'geometry'
  | 'localContext'
  | 'places'
  | 'visualization'
)[] = ['places'];

export default function Map({
  drivers,
  attendees,
  mapCallback,
}: {
  drivers: IPerson[];
  attendees: IPerson[];
  mapCallback: (
    // eslint-disable-next-line no-unused-vars
    rider: IPerson | null | undefined,
    // eslint-disable-next-line no-unused-vars
    driver: IPerson | null | undefined
  ) => void;
}) {
  /** Load the Google Maps library * */
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: 'XXXXX',
    libraries: gLibraries,
  });

  const [mapDrivers, setMapDrivers] = useState<IPerson[]>(drivers);
  const [mapAttendees, setMapAttendees] = useState<IPerson[]>(attendees);

  /**
   * Keep the list of drivers up to date
   */
  useEffect(() => {
    setMapDrivers(drivers);
  }, [drivers]);

  /**
   * Keep the list of attendees up to date
   * */
  useEffect(() => {
    setMapAttendees(attendees);
  }, [attendees]);

  const addRider = (
    rider: IPerson | null | undefined,
    driver: IPerson | null | undefined
  ) => {
    mapCallback(rider, driver);
  };

  // without height and width you won't see a map
  const mapContainerStyle = {
    height: '80vh',
    width: '90vw',
    margin: 'auto',
  };
  // RLC is the default center
  const defaultProps = {
    center: {
      lat: 35.7298286,
      lng: -78.77857179999999,
    },
    zoom: 12,
  };

  const options = {
    disableDefaultUI: true,
    zoomControl: true,
    mapContainerStyle: { mapContainerStyle },
    center: defaultProps.center,
    zoom: 11,
  };

  const renderMap = () => {
    return (
      <GoogleMap options={options} mapContainerStyle={mapContainerStyle}>
        {isLoaded && (
          <PlaceInfo
            markerPlaces={[ChurchPlace]}
            type="church"
            drivers={[]}
            placeCallback={null}
          />
        )}
        <PlaceInfo
          markerPlaces={mapDrivers}
          type="drivers"
          drivers={[]}
          placeCallback={null}
        />
        <PlaceInfo
          markerPlaces={mapAttendees}
          type="attendees"
          drivers={mapDrivers}
          placeCallback={addRider}
        />
      </GoogleMap>
    );
  };

  if (loadError) {
    return <div>Map cannot be loaded right now, sorry.</div>;
  }
  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  return renderMap();
}
// // Path: src/Places.tsx
