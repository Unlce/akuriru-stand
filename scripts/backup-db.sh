#!/bin/bash
# データベースバックアップスクリプト
# アクリルスタンド工房 - Database Backup Script

set -e  # エラーで停止

# =====================================================
# 設定
# =====================================================

# バックアップディレクトリ
BACKUP_DIR="./database/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="acrylic_stand_backup_${DATE}.sql"

# データベース設定（環境変数から取得）
DB_HOST="${DB_HOST:-mysql324.phy.lolipop.lan}"
DB_NAME="${DB_NAME:-LAA1658426-stand}"
DB_USER="${DB_USER:-LAA1658426}"
DB_PASS="${DB_PASS}"

# 保持する世代数
KEEP_DAYS=30

# =====================================================
# 関数定義
# =====================================================

# ヘルプメッセージ
show_help() {
    cat << EOF
使用方法: $0 [オプション]

データベースバックアップスクリプト

オプション:
    -h, --help          このヘルプを表示
    -e, --env ENV       環境を指定 (local, gcp, lolipop)
    -o, --output FILE   出力ファイル名を指定
    -c, --compress      バックアップをgzip圧縮

例:
    $0                          # デフォルト設定でバックアップ
    $0 -e lolipop              # Lolipop環境のバックアップ
    $0 -c                      # 圧縮バックアップ
    $0 -o custom_backup.sql    # カスタムファイル名

環境変数:
    DB_HOST    データベースホスト
    DB_NAME    データベース名
    DB_USER    ユーザー名
    DB_PASS    パスワード
EOF
}

# バックアップディレクトリの作成
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "📁 バックアップディレクトリを作成: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# バックアップ実行
backup_database() {
    local output_file="$1"
    local compress="$2"
    
    echo "🚀 バックアップ開始: $(date)"
    echo "   ホスト: $DB_HOST"
    echo "   データベース: $DB_NAME"
    echo "   出力: $output_file"
    
    # mysqldump コマンド
    if [ "$compress" = "yes" ]; then
        echo "   圧縮: 有効"
        mysqldump \
            --host="$DB_HOST" \
            --user="$DB_USER" \
            --password="$DB_PASS" \
            --single-transaction \
            --quick \
            --lock-tables=false \
            --routines \
            --triggers \
            --events \
            "$DB_NAME" | gzip > "${output_file}.gz"
        
        echo "✅ バックアップ完了: ${output_file}.gz"
        echo "   サイズ: $(du -h "${output_file}.gz" | cut -f1)"
    else
        mysqldump \
            --host="$DB_HOST" \
            --user="$DB_USER" \
            --password="$DB_PASS" \
            --single-transaction \
            --quick \
            --lock-tables=false \
            --routines \
            --triggers \
            --events \
            "$DB_NAME" > "$output_file"
        
        echo "✅ バックアップ完了: $output_file"
        echo "   サイズ: $(du -h "$output_file" | cut -f1)"
    fi
}

# 古いバックアップの削除
cleanup_old_backups() {
    echo "🧹 古いバックアップの削除（${KEEP_DAYS}日以前）"
    
    find "$BACKUP_DIR" -name "acrylic_stand_backup_*.sql" -mtime +$KEEP_DAYS -delete
    find "$BACKUP_DIR" -name "acrylic_stand_backup_*.sql.gz" -mtime +$KEEP_DAYS -delete
    
    local remaining=$(find "$BACKUP_DIR" -name "acrylic_stand_backup_*" | wc -l)
    echo "   残りのバックアップ: ${remaining}個"
}

# バックアップリストの表示
list_backups() {
    echo ""
    echo "📋 最近のバックアップ一覧:"
    ls -lh "$BACKUP_DIR"/acrylic_stand_backup_* 2>/dev/null | tail -10 || echo "   バックアップファイルがありません"
}

# =====================================================
# メイン処理
# =====================================================

# 引数解析
COMPRESS="no"
OUTPUT_FILE=""
ENV=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS="yes"
            shift
            ;;
        *)
            echo "❌ 不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# 環境別設定の読み込み
if [ -n "$ENV" ]; then
    if [ -f ".env.${ENV}.example" ]; then
        echo "🔧 環境設定を読み込み: $ENV"
        source ".env.${ENV}.example"
    else
        echo "⚠️  環境設定ファイルが見つかりません: .env.${ENV}.example"
    fi
fi

# パスワードチェック
if [ -z "$DB_PASS" ]; then
    echo "❌ エラー: データベースパスワードが設定されていません"
    echo "   環境変数 DB_PASS を設定するか、.env ファイルを使用してください"
    exit 1
fi

# バックアップディレクトリ作成
create_backup_dir

# 出力ファイル名の決定
if [ -z "$OUTPUT_FILE" ]; then
    OUTPUT_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
else
    OUTPUT_FILE="${BACKUP_DIR}/${OUTPUT_FILE}"
fi

# バックアップ実行
backup_database "$OUTPUT_FILE" "$COMPRESS"

# 古いバックアップの削除
cleanup_old_backups

# バックアップリスト表示
list_backups

echo ""
echo "🎉 バックアップ処理が完了しました！"
echo "完了時刻: $(date)"
