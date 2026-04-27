interface MockTxParams {
  type: "LIMIT" | "MARKET";
  price: number;
  amount: string;
  stopLoss: number;
  positionLimit: boolean;
}

export async function mockBuildTx(params: MockTxParams): Promise<void> {
  // Simulate transaction building delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log("Mock transaction built:", params);
}
