export interface FluidityLink {
    name: string;
    location: string;
}
export type FluidityField = string | Date | FluidityLink;
export interface FormattedData {
    suggestStyle: number;
    field: FluidityField;
    fieldType: 'LINK' | 'DATE' | 'STRING';
}
export interface FluidityPacket {
    site: string;
    description: string;
    plugin: string;
    formattedData: FormattedData[];
    rawData?: string | null;
}
export declare const isFfluidityPacket: (obj: any, omitFormattedData?: boolean) => obj is FluidityPacket;
export interface PublishTarget {
    location: string;
    key: string;
}
export type StringAble = {
    toString(): string;
};
export type NodeEnv = 'development' | 'production' | null;
//# sourceMappingURL=types.d.ts.map