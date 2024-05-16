use std::fs;
extern crate pretty_env_logger;
#[macro_use]
extern crate log;

pub mod yosys;

fn main() {
    pretty_env_logger::init();

    // Read temp.json
    let json = fs::read_to_string("temp.json").unwrap();
    let data: Result<yosys::types::YosysData, serde_path_to_error::Error<serde_json::Error>> =
        serde_path_to_error::deserialize(&mut serde_json::Deserializer::from_str(&json));
    match data {
        Ok(yosys_data) => println!("{:?}", yosys_data),
        Err(e) => {
            println!("{}", e.path().to_string());
            panic!("Error: {}", e);
        }
    }
}
