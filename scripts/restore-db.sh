#!/bin/bash
# データベースリストアスクリプト
# アクリルスタンド工房 - Database Restore Script

set -e  # エラーで停止

# =====================================================
# 設定
# =====================================================

# バックアップディレクトリ
BACKUP_DIR="./database/backups"

# データベース設定（環境変数から取得）
DB_HOST="${DB_HOST:-mysql}"
DB_NAME="${DB_NAME:-acrylic_stand}"
DB_USER="${DB_USER:-stand_user}"
DB_PASS="${DB_PASS}"

# =====================================================
# 関数定義
# =====================================================

# ヘルプメッセージ
show_help() {
    cat << EOF
使用方法: $0 [オプション] <バックアップファイル>

データベースリストアスクリプト

オプション:
    -h, --help          このヘルプを表示
    -e, --env ENV       環境を指定 (local, gcp, lolipop)
    -l, --list          利用可能なバックアップファイルを一覧表示
    -f, --force         確認なしで実行
    --latest            最新のバックアップをリストア

例:
    $0 -l                                        # バックアップ一覧を表示
    $0 --latest                                  # 最新バックアップをリストア
    $0 -e local backup_20251229.sql             # ローカル環境へリストア
    $0 -f acrylic_stand_backup_20251229.sql.gz  # 圧縮ファイルをリストア

環境変数:
    DB_HOST    データベースホスト
    DB_NAME    データベース名
    DB_USER    ユーザー名
    DB_PASS    パスワード
EOF
}

# バックアップファイル一覧
list_backups() {
    echo "📋 利用可能なバックアップファイル:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "   バックアップディレクトリが存在しません: $BACKUP_DIR"
        return 1
    fi
    
    local files=$(find "$BACKUP_DIR" -name "*.sql" -o -name "*.sql.gz" | sort -r)
    
    if [ -z "$files" ]; then
        echo "   バックアップファイルが見つかりません"
        return 1
    fi
    
    echo "$files" | while read file; do
        local size=$(du -h "$file" | cut -f1)
        local date=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)
        echo "   📄 $(basename "$file")"
        echo "      サイズ: $size | 作成日時: $date"
    done
}

# 最新バックアップファイルの取得
get_latest_backup() {
    find "$BACKUP_DIR" -name "*.sql" -o -name "*.sql.gz" | sort -r | head -1
}

# データベースリストア
restore_database() {
    local backup_file="$1"
    
    # ファイル存在確認
    if [ ! -f "$backup_file" ]; then
        echo "❌ エラー: バックアップファイルが見つかりません: $backup_file"
        exit 1
    fi
    
    echo "🚀 リストア開始: $(date)"
    echo "   ホスト: $DB_HOST"
    echo "   データベース: $DB_NAME"
    echo "   ソース: $backup_file"
    echo ""
    
    # 圧縮ファイルかどうか確認
    if [[ "$backup_file" == *.gz ]]; then
        echo "   圧縮ファイルを展開してリストア..."
        gunzip -c "$backup_file" | mysql \
            --host="$DB_HOST" \
            --user="$DB_USER" \
            --password="$DB_PASS" \
            "$DB_NAME"
    else
        mysql \
            --host="$DB_HOST" \
            --user="$DB_USER" \
            --password="$DB_PASS" \
            "$DB_NAME" < "$backup_file"
    fi
    
    echo "✅ リストア完了！"
    echo "完了時刻: $(date)"
}

# 確認プロンプト
confirm_restore() {
    local backup_file="$1"
    
    echo "⚠️  警告: この操作は既存のデータを上書きします！"
    echo ""
    echo "リストア先:"
    echo "   ホスト: $DB_HOST"
    echo "   データベース: $DB_NAME"
    echo ""
    echo "バックアップファイル:"
    echo "   $(basename "$backup_file")"
    echo "   サイズ: $(du -h "$backup_file" | cut -f1)"
    echo ""
    
    read -p "本当にリストアしますか？ (yes/no): " answer
    
    if [ "$answer" != "yes" ]; then
        echo "❌ リストアをキャンセルしました"
        exit 0
    fi
}

# データベース接続テスト
test_connection() {
    echo "🔌 データベース接続をテスト中..."
    
    if mysql \
        --host="$DB_HOST" \
        --user="$DB_USER" \
        --password="$DB_PASS" \
        -e "SELECT 1" "$DB_NAME" &>/dev/null; then
        echo "✅ 接続成功"
        return 0
    else
        echo "❌ 接続失敗"
        return 1
    fi
}

# =====================================================
# メイン処理
# =====================================================

# 引数解析
FORCE="no"
LIST_ONLY="no"
USE_LATEST="no"
ENV=""
BACKUP_FILE=""

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
        -l|--list)
            LIST_ONLY="yes"
            shift
            ;;
        -f|--force)
            FORCE="yes"
            shift
            ;;
        --latest)
            USE_LATEST="yes"
            shift
            ;;
        *)
            BACKUP_FILE="$1"
            shift
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

# バックアップ一覧表示のみ
if [ "$LIST_ONLY" = "yes" ]; then
    list_backups
    exit 0
fi

# 最新バックアップを使用
if [ "$USE_LATEST" = "yes" ]; then
    BACKUP_FILE=$(get_latest_backup)
    if [ -z "$BACKUP_FILE" ]; then
        echo "❌ エラー: バックアップファイルが見つかりません"
        exit 1
    fi
    echo "📄 最新のバックアップを使用: $(basename "$BACKUP_FILE")"
fi

# バックアップファイルの指定確認
if [ -z "$BACKUP_FILE" ]; then
    echo "❌ エラー: バックアップファイルが指定されていません"
    echo ""
    show_help
    exit 1
fi

# フルパスに変換
if [[ "$BACKUP_FILE" != /* ]]; then
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
    elif [ ! -f "$BACKUP_FILE" ]; then
        echo "❌ エラー: ファイルが見つかりません: $BACKUP_FILE"
        exit 1
    fi
fi

# パスワードチェック
if [ -z "$DB_PASS" ]; then
    echo "❌ エラー: データベースパスワードが設定されていません"
    echo "   環境変数 DB_PASS を設定してください"
    exit 1
fi

# データベース接続テスト
if ! test_connection; then
    echo "❌ データベースに接続できません。設定を確認してください。"
    exit 1
fi

# 確認プロンプト（強制モードでない場合）
if [ "$FORCE" != "yes" ]; then
    confirm_restore "$BACKUP_FILE"
fi

# リストア実行
restore_database "$BACKUP_FILE"

echo ""
echo "🎉 リストア処理が完了しました！"
