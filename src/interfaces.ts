export interface ConfigurationMatrix {
  [key: string]: ConfigurationValue[];
}

export type ResultConfiguration<Config extends ConfigurationMatrix> = {
  [key in keyof Config]: Config[key][number];
};

export type ConfigurationValue = boolean | number | string;
