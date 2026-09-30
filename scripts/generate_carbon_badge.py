# ANOS Carbon Badge Generator

import os


def build_badge(saved_co2_kg: float) -> str:
    return f"[![ANOS Carbon Saver](https://img.shields.io/badge/ANOS-Saved_{saved_co2_kg:.1f}kg_CO2-brightgreen)](https://github.com/sidibemallet8-sudo/anos)"


if __name__ == '__main__':
    print(build_badge(120.0))
