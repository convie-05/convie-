#include <iostream>
#include <vector>
#include <algorithm>
#include <cstring>
using namespace std;

const int MAXN = 2005;
int n, a[MAXN];
bool pair_[MAXN][MAXN];   // pair[i][j] = a[i] 和 a[j] 不互质
bool can[MAXN][MAXN];     // can[l][r] = 区间 [l, r] 合法
int dp[MAXN];             // dp[i] = 前 i 个元素最多段数

int gcd(int x, int y) {
    return y ? gcd(y, x % y) : x;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n;
    for (int i = 1; i <= n; i++) {
        cin >> a[i];
    }

    if (n < 2) {
        cout << -1 << endl;
        return 0;
    }

    // 预处理两两之间的不互质关系
    for (int i = 1; i <= n; i++) {
        for (int j = i + 1; j <= n; j++) {
            if (gcd(a[i], a[j]) > 1) {
                pair_[i][j] = pair_[j][i] = true;
            }
        }
    }

    // 预处理所有合法区间，O(n^2)
    // 固定右端点 r，扩展左端点 l
    for (int r = 1; r <= n; r++) {
        // cnt[i] = 元素 i 在 [l, r] 中的伙伴数
        vector<int> cnt(n + 1, 0);
        int zeroCnt = 0;  // 伙伴数为 0 的元素个数

        // 初始区间 [r, r]
        cnt[r] = 0;
        zeroCnt = 1;

        for (int l = r; l >= 1; l--) {
            if (l < r) {
                // 加入元素 l
                // l 的伙伴数 = 区间内与 l 不互质的元素数
                int lcnt = 0;
                for (int k = l + 1; k <= r; k++) {
                    if (pair_[l][k]) {
                        lcnt++;
                        if (cnt[k] == 0) zeroCnt--;
                        cnt[k]++;
                    }
                }
                if (lcnt > 0) {
                    if (cnt[l] == 0) zeroCnt--;
                    cnt[l] += lcnt;
                } else {
                    if (cnt[l] == 0) {
                        // 保持 zeroCnt 不变（已经计数了）
                    }
                    cnt[l] += lcnt; // +0
                }
            }

            // 检查区间 [l, r] 是否合法
            if (r - l + 1 >= 2 && zeroCnt == 0) {
                can[l][r] = true;
            }
        }
    }

    // DP：求最多段数
    memset(dp, -1, sizeof(dp));
    dp[0] = 0;

    for (int r = 1; r <= n; r++) {
        for (int l = 1; l <= r; l++) {
            if (can[l][r] && dp[l - 1] != -1) {
                dp[r] = max(dp[r], dp[l - 1] + 1);
            }
        }
    }

    cout << dp[n] << endl;

    return 0;
}