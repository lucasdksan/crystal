declare module "ml-som" {
  interface SomOptions {
    fields: number;
    iterations: number;
  }

  export default class SOM {
    constructor(gridX: number, gridY: number, options: SomOptions);
    train(data: number[][]): void;
    predict(data: number[][]): [number, number][];
  }
}
