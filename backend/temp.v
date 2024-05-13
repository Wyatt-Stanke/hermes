
module uut_always01(clock, reset, count);

input clock, reset;
output [7:0] count;
reg [7:0] count;

always @(posedge clock)
	count <= reset ? 0 : count + 1;

endmodule