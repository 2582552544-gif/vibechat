import random

STATIC = [
    "此刻你是醒着睡不着，还是不想睡？",
    "不用解释全部，现在最重的一个感受是什么？",
]


def get_icebreaker(sync_points: list[str]) -> str:
    if sync_points:
        return f"你们{sync_points[0]}——先从这点说一句？"
    return random.choice(STATIC)
