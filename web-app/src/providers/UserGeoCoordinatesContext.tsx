"use client";
import { createContext, useContext, useEffect, useState } from "react";

export const UserGeoCoordinatesContext = createContext<{
    latitude: number | undefined;
    longitude: number | undefined;
}>({
    latitude: 0,
    longitude: 0,
});

type UserGeoCoordinatesProviderProps = {
    children: React.ReactNode;
};

export const UserGeoCoordinatesProvider = ({ children }: UserGeoCoordinatesProviderProps) => {
    const [latitude, setLatitude] = useState<number | undefined>(undefined);
    const [longitude, setLongitude] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        window.navigator.geolocation.getCurrentPosition((position) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
        }, (error) => {
            console.error(error);
        }, {
            timeout: 10000,
            maximumAge: 0,
            enableHighAccuracy: true,
        });
    }, []);

    return <UserGeoCoordinatesContext.Provider value={{ latitude, longitude }}>{children}</UserGeoCoordinatesContext.Provider>;
};

export const useUserGeoCoordinates = () => {
    return useContext(UserGeoCoordinatesContext);
};