use serde::{Deserialize, Serialize};
use serde_aux::prelude::*;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct Port {
    pub direction: Direction,
    pub bits: Vec<u32>, // Assuming bits are represented as u32
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Input,
    Output,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum NumberOrString {
    Number(u32),
    String(String),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CellBase {
    pub hide_name: u32,
    // pub parameters: HashMap<String, NumberOrString>, // Using HashMap for flexibility
    pub attributes: HashMap<String, String>,
    pub port_directions: HashMap<String, Direction>,
    pub connections: Connections,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum Cell {
    #[serde(
        alias = "$not",
        alias = "$pos",
        alias = "$neg",
        alias = "$reduce_and",
        alias = "$reduce_or",
        alias = "$reduce_xor",
        alias = "$reduce_xnor",
        alias = "$reduce_bool",
        alias = "$logic_not"
    )]
    UnaryCell(UnaryCell),
    // TODO: Add other cell types
    #[serde(
        alias = "$or",
        alias = "$and",
        alias = "$xor",
        alias = "$xnor",
        alias = "$shl",
        alias = "$shr",
        alias = "$sshl",
        alias = "$sshr",
        alias = "$logic_and",
        alias = "$logic_or",
        alias = "$eqx",
        alias = "$nex",
        alias = "$lt",
        alias = "$le",
        alias = "$eq",
        alias = "$ne",
        alias = "$ge",
        alias = "$gt",
        alias = "$add",
        alias = "$sub",
        alias = "$mul",
        alias = "$div",
        alias = "$mod",
        alias = "$pow"
    )]
    BinaryCell(BinaryCell),
    #[serde(alias = "$mux")]
    MuxCell(MuxCell),
    #[serde(alias = "$pmux")]
    PMuxCell(PMuxCell),
    #[serde(alias = "$sr")]
    SrCell(SrCell),
    #[serde(alias = "$dff")]
    DffCell(DffCell),
    #[serde(alias = "$adff")]
    ADffCell(ADffCell),
    #[serde(alias = "$sdff")]
    SDffCell(SDffCell),
    #[serde(alias = "$dffsr")]
    DffsrCell(DffsrCell),
    #[serde(alias = "$dffe")]
    DffeCell(DffeCell),
    #[serde(alias = "$adffe")]
    ADffeCell(ADffeCell),
    #[serde(alias = "$sdffe")]
    SDffeCell(SDffeCell),
    #[serde(alias = "$dffsre")]
    DffsreCell(DffsreCell),
    #[serde(alias = "$mem")]
    MemCell(MemCell),
    #[serde(alias = "$print")]
    PrintCell,
}

pub type Connections = HashMap<String, Vec<NumberOrString>>;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct UnaryCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub a_signed: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub a_width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub y_width: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UnaryCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: UnaryCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct BinaryCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub a_signed: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub a_width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub b_signed: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub b_width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub y_width: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BinaryCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: BinaryCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct MuxCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MuxCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: MuxCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct PMuxCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub s_width: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PMuxCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: PMuxCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct SrCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub set_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clr_polarity: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SrCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: SrCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct DffCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DffCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: DffCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct ADffCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub arst_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub arst_value: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ADffCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: ADffCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct SDffCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub srst_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub srst_value: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SDffCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: SDffCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct DffsrCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub set_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clr_polarity: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DffsrCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: DffsrCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct DffeCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub en_polarity: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DffeCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: DffeCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct ADffeCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub en_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub arst_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub arst_value: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ADffeCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: ADffeCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct SDffeCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub en_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub srst_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub srst_value: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SDffeCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: SDffeCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct DffsreCellParameters {
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub set_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub clr_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub en_polarity: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DffsreCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: DffsreCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub struct MemCellParameters {
    pub memid: String,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub size: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub abits: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub width: u32,
    pub init: String,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub offset: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_ports: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_wide_continuation: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_clk_enable: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_transparency_mask: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_collision_x_mask: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub rd_ce_over_srst: u32,
    pub rd_init_value: String,
    pub rd_arst_value: String,
    pub rd_srst_value: String,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub wr_ports: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub wr_wide_continuation: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub wr_clk_enable: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub wr_clk_polarity: u32,
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub wr_priority_mask: u32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MemCell {
    #[serde(flatten)]
    pub base: CellBase,
    pub parameters: MemCellParameters,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PrintCell {
    #[serde(flatten)]
    pub base: CellBase,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Net {
    pub hide_name: u32,
    pub attributes: HashMap<String, String>,
    pub bits: Vec<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Module {
    pub attributes: HashMap<String, String>,
    pub parameter_default_values: Option<HashMap<String, String>>,
    pub ports: HashMap<String, Port>,
    pub cells: HashMap<String, Cell>,
    pub netnames: HashMap<String, Net>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct YosysData {
    pub creator: String,
    pub modules: HashMap<String, Module>,
}
