use log::debug;
use serde_json::Value;
use std::fs;
use std::io::Read;
use std::process::Command;

async fn run_yosys(
    source: &str,
    commands: Vec<&str>,
    modules: Vec<&str>,
) -> Result<Value, Box<dyn std::error::Error>> {
    let binary = "./yosys/yosys";
    let output = "temp.json";
    let command = format!(
        "{} -o {} -p \"{}\" {}{}",
        binary,
        output,
        commands.join("; "),
        if modules.len() > 0 {
            format!("-r {} ", modules.join(" "))
        } else {
            "".to_string()
        },
        source
    );
    debug!("{}", command);

    let process = Command::new(command)
        .output()
        .expect("failed to execute process");

    let mut file = fs::File::open(output)?;
    let mut data = String::new();
    file.read_to_string(&mut data)?;
    let data: Value = serde_json::from_str(&data)?;

    Ok(data)
}

pub async fn compile(source: &str) -> Result<Value, Box<dyn std::error::Error>> {
    if fs::metadata("temp.v").is_ok() {
        fs::remove_file("temp.v")?;
    }

    fs::write("temp.v", source)?;

    // First pass (list mod names)
    let result = run_yosys("temp.v", vec!["proc"], vec![]).await?;
    let module_names = result
        .get("modules")
        .and_then(|v| v.as_object())
        .map(|modules| modules.keys().cloned().collect())
        .unwrap_or_else(|| vec![]);

    // Second pass (extract data)
    let module_names: Vec<&str> = module_names.iter().map(|name| name.as_str()).collect();
    let data = run_yosys(
        "temp.v",
        vec![
            "proc",
            "flatten",
            "wreduce",
            "opt",
            "fsm",
            "opt",
            "memory -nomap -nordff",
            "opt",
            "muxpack",
            "peepopt",
            "async2sync",
            "wreduce",
            "opt -mux_bool",
            "clean",
            // "autoname",
            "check",
            "show -colors 1 -format png -prefix temp",
        ],
        module_names,
    )
    .await?;

    Ok(data)
}
