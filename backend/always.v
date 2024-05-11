module uut_always01(clock, reset, count);

input clock, reset;
output [7:0] count;
reg [7:0] count;

always @(posedge clock)
	count <= reset ? 0 : count + 1;

endmodule

// module alu(clock, reset, a, b, op, result);

// input clock, reset;
// input [7:0] a, b;
// input [2:0] op;
// output [7:0] result;
// reg [7:0] result;

// always @(posedge clock)
// 	if (reset)
// 		result <= 0;
// 	else
// 		case (op)
// 			3'b000: result <= a + b;
// 			3'b001: result <= a - b;
// 			3'b010: result <= a & b;
// 			3'b011: result <= a | b;
// 			3'b100: result <= a ^ b;
// 			3'b101: result <= a << b;
// 			3'b110: result <= a >> b;
// 			3'b111: result <= a;
// 		endcase

// endmodule