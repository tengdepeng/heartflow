fn main() {
    // 修复：原逻辑在 `std` feature 未显式启用时走 `emit_sysroot_crate("std")`，
    // 但那只会 emit `cfg(std)` 而非 `cfg(has_std)`，导致源码里 `#[cfg(has_std)]` 的
    // `IndexMap<K,V,S=RandomState>`（带默认 S）永远不生效，在 android 交叉编译等场景下
    // 触发 schemars 0.8.22 使用 `indexmap::IndexMap<K,V>`（两参）报 E0107。
    // 这里无条件 emit `has_std`，使 `IndexMap` 始终带默认 `S`，宿主与 android 均安全
    // （std 在两者均可用）。
    autocfg::emit("has_std");
    autocfg::rerun_path("build.rs");
}
